extern crate rusty_machine;
extern crate rulinalg;

pub mod knn_shapley {
    use knn_shapley::rusty_machine::linalg::Matrix;
    use knn_shapley::rusty_machine::linalg::Vector;
    use knn_shapley::rusty_machine::prelude::BaseMatrix;
    use knn_shapley::rusty_machine::linalg::Metric;
    use std::cmp::min;

    fn distance_from_sample(training_features: &Matrix<f64>, test_sample: &Vector<f64>) -> Vec<f64> {
        return training_features.iter_rows()
                                .map(|row| (Vector::new(row) - test_sample).norm())
                                .collect();
    }

    fn shapleys_from_distances(distances: Vec<f64>, training_labels: &Vector<u32>, test_label: u32, k: usize) -> Vector<f64> {
        let num_training_labels = distances.len();
        let mut shapleys = vec![0.0; num_training_labels];
        let mut training_iter = num_training_labels;
        let mut lastvalue = 0.0;
        let mut lastkey = None;

        let mut index_vec: Vec<usize> = (0..num_training_labels).collect();
        // Get indices of sorted array in descending order
        index_vec
            .sort_by(|idx_a, idx_b| distances[*idx_b]
                                    .partial_cmp(&distances[*idx_a])
                                    .unwrap());
        let mut first_iter = true;
        for key in index_vec.iter() {
            if !first_iter {
                let numerator = ((((training_labels[*key] == test_label) as i8) 
                                - ((training_labels[lastkey.unwrap()] == test_label) as i8)) as f64)
                                * ((min(k-1, training_iter-1) + 1) as f64);
                let denominator = (k * training_iter) as f64;
                lastvalue += numerator/denominator;
            } else {
                first_iter = false;
            }
            lastkey = Some(*key);
            training_iter -= 1;
            shapleys[*key] = lastvalue;
        }
        return Vector::new(shapleys);
    }
    pub fn calculate_knn_shapleys(training_features: &Matrix<f64>, training_labels: &Vector<u32> , test_features: &Matrix<f64>, test_labels: &Vector<u32>, k: usize) -> Vector<f64> {
        assert_eq!(training_features.rows(), training_labels.size());
        assert_eq!(test_features.rows(), test_labels.size());
        assert_eq!(training_features.cols(), test_features.cols());

        let res1: Vec<(usize, Vec<f64>)> = test_features.iter_rows().enumerate()
                     .map(|(idx, row)| (idx, distance_from_sample(&training_features, &Vector::new(row)) )).collect();
        let res2: Vec<Vector<f64>> = res1.iter().map(|(idx, dist)| shapleys_from_distances(dist.to_vec(), training_labels, test_labels[*idx], k)).collect();
        let res3 = res2.iter().fold::<Vector<f64>,_>(Vector::new(vec![0.0;training_labels.size()]), |sum_vec, shapleys| sum_vec + shapleys);
        res3
    }
}